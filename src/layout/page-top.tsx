import React from "react";

const PageTop: React.FC = () => {
    return (
        <>
            <style>
                {`
                    .page-top {
                        background-color: #7879e7;
                        color: white;
                        margin-bottom: 20px;
                    }
                    .text-center {
                        padding-left:20px
                    }
                `}
            </style>
            <div className="page-top">
                <h1 className="text-center">博客后台管理系统</h1>
            </div>
        </>
    );
}

export { PageTop }
